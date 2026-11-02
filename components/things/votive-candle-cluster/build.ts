import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const IMAGERY = {
  guadalupe: 'The Virgin in a teal cloak inside a blaze of golden rays.',
  heart: 'A sacred heart, red, crowned with flame and ringed with thorns.',
  saint: 'A haloed saint in a brown robe, hands raised.',
  cross: 'A plain cross with rays on white glass, churchly and spare.',
  plain: 'No pictures: plain glass in jewel colours, red, blue, green and amber.',
  muerte: 'A hooded skeleton with a scythe on purple and black, a folk saint of death.',
} as const;

const paint: Record<Exclude<keyof typeof IMAGERY, 'plain'>, (g: Ctx) => string> = {
  guadalupe(g) {
    g.fillStyle = '#f2b61e'; g.beginPath();
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, r = i % 2 ? 1 : 0.8; g.lineTo(128 + Math.cos(a) * 62 * r, 132 + Math.sin(a) * 100 * r); }
    g.fill();
    g.fillStyle = '#17807a'; g.beginPath(); g.moveTo(128, 52); g.quadraticCurveTo(178, 120, 164, 214); g.lineTo(92, 214); g.quadraticCurveTo(78, 120, 128, 52); g.fill();
    g.fillStyle = '#d9577c'; g.beginPath(); g.moveTo(128, 96); g.lineTo(150, 214); g.lineTo(106, 214); g.fill();
    g.fillStyle = '#c99a72'; g.beginPath(); g.arc(128, 84, 13, 0, 7); g.fill();
    g.fillStyle = '#20201c'; g.beginPath(); g.arc(128, 226, 24, 0, Math.PI); g.fill();
    return '#f5ecd8';
  },
  heart(g) {
    g.strokeStyle = '#f2b61e'; g.lineWidth = 5;
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 58, 140 + Math.sin(a) * 58); g.lineTo(128 + Math.cos(a) * 96, 140 + Math.sin(a) * 96); g.stroke(); }
    g.fillStyle = '#f28a1c'; g.beginPath(); g.moveTo(104, 96); g.quadraticCurveTo(110, 50, 128, 30); g.quadraticCurveTo(150, 54, 152, 96); g.fill();
    g.fillStyle = '#c8141e'; g.beginPath(); g.moveTo(128, 208); g.bezierCurveTo(40, 150, 76, 70, 128, 108); g.bezierCurveTo(180, 70, 216, 150, 128, 208); g.fill();
    g.strokeStyle = '#3a2412'; g.lineWidth = 6; g.setLineDash([10, 6]); g.beginPath(); g.ellipse(128, 146, 52, 14, -0.15, 0, 7); g.stroke(); g.setLineDash([]);
    return '#f5ecd8';
  },
  saint(g) {
    g.fillStyle = '#f2c230'; g.beginPath(); g.arc(128, 70, 34, 0, 7); g.fill();
    g.fillStyle = '#6b4526'; g.beginPath(); g.moveTo(128, 78); g.quadraticCurveTo(186, 110, 176, 226); g.lineTo(80, 226); g.quadraticCurveTo(70, 110, 128, 78); g.fill();
    g.fillStyle = '#d0a57c'; g.beginPath(); g.arc(128, 72, 17, 0, 7); g.fill();
    g.beginPath(); g.arc(98, 120, 9, 0, 7); g.arc(158, 120, 9, 0, 7); g.fill();
    g.fillStyle = '#f1e6c8'; g.fillRect(122, 130, 12, 96);
    return '#dfeaf0';
  },
  cross(g) {
    g.strokeStyle = '#d9a521'; g.lineWidth = 4;
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 40, 118 + Math.sin(a) * 40); g.lineTo(128 + Math.cos(a) * 92, 118 + Math.sin(a) * 92); g.stroke(); }
    g.fillStyle = '#7a1a22'; g.fillRect(114, 44, 28, 176); g.fillRect(76, 92, 104, 28);
    return '#f7f3e8';
  },
  muerte(g) {
    g.fillStyle = '#17131c'; g.beginPath(); g.moveTo(128, 34); g.quadraticCurveTo(196, 90, 184, 230); g.lineTo(72, 230); g.quadraticCurveTo(60, 90, 128, 34); g.fill();
    g.fillStyle = '#efe9da'; g.beginPath(); g.ellipse(128, 96, 26, 30, 0, 0, 7); g.fill(); g.fillRect(114, 116, 28, 16);
    g.fillStyle = '#17131c'; g.beginPath(); g.arc(117, 94, 8, 0, 7); g.arc(139, 94, 8, 0, 7); g.fill();
    g.strokeStyle = '#d9a521'; g.lineWidth = 6; g.beginPath(); g.moveTo(196, 236); g.lineTo(196, 40); g.stroke();
    g.beginPath(); g.moveTo(196, 44); g.quadraticCurveTo(150, 22, 122, 46); g.stroke();
    return '#6a3a9a';
  },
};
const JEWELS = ['#c81e2a', '#1f56b8', '#1f8a4a', '#e09a1a', '#7a35b0', '#f3ead8'];
const WAX = { white: ['#f6efdc'], cream: ['#f1dfb2', '#f6efdc'], red: ['#c4222c', '#a81a22'], purple: ['#6a3a9a', '#8a5ab8', '#f6efdc'], rainbow: ['#e5257e', '#18b5b0', '#f6c21c', '#49b848', '#7a3fc0', '#f2702a', '#f6efdc'] } as const;

export default defineThing({
  questions: {
    arrangement: choice('How is the gathering arranged?', { scattered: 'A close informal scattering.', rows: 'Ordered staggered rows.', crescent: 'A curved crescent around an open centre.', spiral: 'A loose spiral from low candles to tall ones.' }),
    vessel: choice('What shape are the tall candle glasses?', { straight: 'Straight round glass columns.', tapered: 'Glasses broadening gently toward the mouth.', fluted: 'Tall glasses with narrow vertical flutes.', faceted: 'Eight-sided glass vessels.' }),
    labelBorder: choice('What frames the printed candle image?', { bands: 'Simple solid bands above and below.', rays: 'Short golden rays around the image.', vines: 'Small leaf vines up both sides.', lace: 'A fine scalloped ornamental border.' }),
    pillarRelief: choice('How are the bare wax pillars shaped?', { smooth: 'Smooth round pillars.', spiral: 'A shallow spiral ridge winds around the wax.', rings: 'Stacked horizontal bands encircle the pillar.', faceted: 'Octagonal pillars with flat faces.' }),
    rimFinish: choice('What finish marks the vessel rims?', { clear: 'Clear pale glass rims.', brass: 'Thin brass-coloured rims.', silver: 'Cool silver rims.', black: 'Dark charcoal rims.' }),
    waxSurface: choice('What texture shows on the exposed wax?', { smooth: 'Smooth poured wax.', rippled: 'Concentric ripples from the last pour.', cracked: 'Fine radial cracks in cooled wax.', flecked: 'Small darker flecks suspended in the wax.' }),
    count: choice('How many candles are gathered?', {
      lone: 'One tall glass candle with a single tea light for company.',
      few: 'Three or four, a private prayer.',
      cluster: 'A dozen or so of mixed heights, a family shrine.',
      crowd: 'A dense crowd of flames, a public vigil.',
    }),
    imagery: choice('What is printed on the tall glass candles?', IMAGERY),
    lit: choice('Are they burning?', {
      all: 'Every one alight.',
      most: 'Most alight, a few gone out.',
      last: 'All dark but one last flame.',
      guttered: 'All burned out or blown out, thin smoke rising from the wicks.',
      unlit: 'Not yet lit: clean wicks, waiting for the match.',
    }),
    burn: score('How far have they burned down?', ['Brand new, full to the brim', 'An hour in', 'Half gone, wax starting to pool', 'Stubs drowning in spilled wax']),
    draught: score('How steady are the flames?', ['Perfectly still, upright teardrops', 'Wavering a little', 'Leaning hard in a draught, close to going out']),
    wax: choice('What colour are the loose candles and tea lights?', {
      white: 'All white.',
      cream: 'Beeswax cream and ivory.',
      red: 'Deep red.',
      purple: 'Mourning purple with a few white.',
      rainbow: 'Every colour, bought one at a time.',
    }),
    stand: choice('What do they stand on?', {
      bare: 'Directly on the surface.',
      tray: 'A hammered tin tray that catches the wax.',
      steps: 'A small two-step wooden riser, tall candles at the back.',
      bricks: 'A couple of rough bricks, a roadside shrine.',
    }),
    left: choice('What has been left among the candles?', {
      nothing: 'Nothing.',
      matches: 'A matchbox and a scatter of spent matches.',
      coins: 'A few coins and a folded note.',
      flowers: 'Marigold heads placed around the candles and their stand.',
      card: 'A small prayer card propped against a candle.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = { lone: [1, 1, 0], few: [2, 1, 1], cluster: [4, 5, 3], crowd: [8, 9, 5] }[a.count].map((v, i) => (a.count === 'lone' ? v : v + Math.round(mood.density * (i === 1 ? 2 : 1))));
    const waxes = WAX[a.wax];
    const burn = Math.min(1, a.burn * 0.9 + mood.wear * 0.15);
    const brightness = mix(0.5, 1, mood.warmth * 0.5 + mood.cheer * 0.5);

    // Stand.
    const spread = { lone: 0.07, few: 0.1, cluster: 0.16, crowd: 0.23 }[a.count];
    if (a.stand === 'tray') {
      s.lathe([[0, 0], [spread * 1.45, 0], [spread * 1.6, 0.014], [spread * 1.57, 0.014], [spread * 1.43, 0.005], [0, 0.005]], s.material('#aab0b0', { metalness: 0.75, roughness: 0.38 })).scale.z = 0.8;
    } else if (a.stand === 'steps') {
      const wood = s.material('#7a5232', { roughness: 0.8 });
      s.box([spread * 3, 0.02, spread * 2.5], [0, 0.01, 0], wood);
      s.box([spread * 3, 0.045, spread * 1.25], [0, 0.0425, -spread * 0.635], wood);
    } else if (a.stand === 'bricks') {
      const brick = s.material('#a9553c', { roughness: 0.95 });
      const w = Math.max(0.22, spread * 1.45);
      for (const side of a.count === 'lone' ? [0] : [-1, 1]) { const b = s.box([w, 0.06, Math.max(0.11, spread * 2.3)], [side * (w / 2 + 0.004), 0.03, 0], brick); b.rotation.y = (random() - 0.5) * 0.06; }
    }

    const standParts=[...s.root.children];s.root.updateMatrixWorld(true);
    const supportRay=new THREE.Raycaster();
    const lift=(x:number,z:number,r=0)=>{
      if(a.stand==='bare')return 0;
      const samples=[[x,z],...Array.from({length:24},(_,i)=>[x+Math.cos(i*Math.PI/12)*r,z+Math.sin(i*Math.PI/12)*r])];
      let height=Infinity,highest=0;for(const [px,pz] of samples){supportRay.set(new THREE.Vector3(px,1,pz),new THREE.Vector3(0,-1,0));const hit=supportRay.intersectObjects(standParts,true)[0];height=Math.min(height,hit?.point.y??0);highest=Math.max(highest,hit?.point.y??0);}
      return highest-height>.0006?-1:Number.isFinite(height)?height:0;
    };

    // Placement: tall at the back, small in front.
    const placed: { x: number; z: number; r: number }[] = [];
    const standBounds=new THREE.Box3().setFromObject(s.root,true);
    const place = (r: number, back: number, needStand=true) => {
      const xmin=!needStand?-spread*2-.08:a.stand==='bare'?-spread*1.4:standBounds.min.x+r+.004,xmax=!needStand?spread*2+.08:a.stand==='bare'?spread*1.4:standBounds.max.x-r-.004;
      const zmin=!needStand?-spread*1.7-.08:a.stand==='bare'?-spread*1.25:standBounds.min.z+r+.004,zmax=!needStand?spread*1.7+.08:a.stand==='bare'?spread*1.25:standBounds.max.z-r-.004;
      const valid=(x:number,z:number)=>x>=xmin&&x<=xmax&&z>=zmin&&z<=zmax&&placed.every(p=>Math.hypot(p.x-x,p.z-z)>p.r+r+.004)&&(needStand||a.stand==='bare'||x-r>standBounds.max.x||x+r<standBounds.min.x||z-r>standBounds.max.z||z+r<standBounds.min.z)&&(a.stand==='bare'||(needStand?lift(x,z,r)>0:lift(x,z,r)>=0))&&(!needStand||a.stand!=='tray'||Math.hypot((Math.abs(x)+r)/(spread*1.425),(Math.abs(z)+r)/(spread*1.425*.8))<1);
      const keep=(x:number,z:number)=>{placed.push({x,z,r});return{x,z};};
      const intervals=needStand&&a.stand==='steps'?[[zmin,-spread*.01-r-.005],[-spread*.01+r+.005,zmax]]:[[zmin,zmax]];
      const rowCandidates:{x:number;z:number}[]=[];
      for(const [low,high] of intervals){if(high<low)continue;const rows=Math.max(1,Math.floor((high-low)/(r*2+.008))+1),columns=Math.max(1,Math.floor((xmax-xmin)/(r*2+.008))+1);for(let row=0;row<rows;row++)for(let column=0;column<columns;column++)rowCandidates.push({x:columns===1?(xmin+xmax)/2:mix(xmin,xmax,column/(columns-1)),z:rows===1?(low+high)/2:mix(low,high,row/(rows-1))});}
      rowCandidates.sort((p,q)=>Math.abs(p.z+back*spread*.55)-Math.abs(q.z+back*spread*.55)||Math.abs(p.x)-Math.abs(q.x));
      if(a.arrangement==='rows')for(const p of rowCandidates)if(valid(p.x,p.z))return keep(p.x,p.z);
      for(let attempt=0;attempt<180;attempt++){
        const index=placed.length,ang=random()*Math.PI*2,d=Math.sqrt(random())*spread;
        let x=Math.cos(ang)*d*1.25,z=Math.sin(ang)*d*.75-back*spread*.45;
        if(a.arrangement==='crescent'){const t=-Math.PI*.85+random()*Math.PI*1.7,reach=spread*(.72+attempt/300);x=Math.sin(t)*reach*1.25;z=Math.cos(t)*reach*.75-spread*.25;}
        if(a.arrangement==='spiral'){const t=(index+attempt*.23)*2.399963,reach=spread*Math.sqrt((index+1)/(n[0]+n[1]+n[2]))+attempt*.0003;x=Math.cos(t)*reach*1.25;z=Math.sin(t)*reach*.75;}
        if(valid(x,z))return keep(x,z);
      }
      // Dense fallback stays on the same flat support and within the same footprint.
      const candidates:{x:number;z:number;rank:number}[]=[];
      const nx=Math.max(1,Math.ceil((xmax-xmin)/.009)),nz=Math.max(1,Math.ceil((zmax-zmin)/.009));
      for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){const x=mix(xmin,xmax,ix/nx),z=mix(zmin,zmax,iz/nz);candidates.push({x,z,rank:Math.abs(z+back*spread*.5)+Math.abs(x)*.25});}
      candidates.sort((p,q)=>p.rank-q.rank);
      for(const p of candidates)if(valid(p.x,p.z))return keep(p.x,p.z);
      throw new Error('Candle gathering does not fit its selected support');
    };

    const total = n[0] + n[1] + n[2];
    const lastLit = Math.floor(random() * total);
    let index = 0;
    const isLit = () => {
      const i = index++;
      if (a.lit === 'all') return true;
      if (a.lit === 'most') return random() > 0.28 || i === lastLit;
      if (a.lit === 'last') return i === lastLit;
      return false;
    };

    const flameGeo = new THREE.LatheGeometry([[0, 0], [0.55, 0.12], [0.7, 0.35], [0.5, 0.7], [0.16, 1.15], [0, 1.45]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
    const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb02e').multiplyScalar(brightness + 0.1) });
    const coreMat = new THREE.MeshBasicMaterial({ color: '#fff3c4' });
    const haloMat = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending });
    const smokeMat = new THREE.MeshBasicMaterial({ color: '#8f8f96', transparent: true, opacity: 0.18, depthWrite: false });
    const wickMat = s.material('#1c1612');
    const flames: { group: THREE.Group; phase: number; size: number }[] = [];
    const lean = a.draught * 0.75;
    const flame = (x: number, y: number, z: number, size: number, lit: boolean) => {
      s.rod([x, y - 0.002, z], [x + 0.001, y + 0.006, z], 0.0012, wickMat);
      if (!lit) {
        if (a.lit === 'guttered' || (a.lit !== 'unlit' && random() < 0.5)) {
          const pts: V3[] = [];
          const drift = (random() - 0.5) * 0.03 + lean * 0.05;
          for (let i = 0; i < 7; i++) pts.push([x + Math.sin(i * 1.1 + random()) * 0.006 * i * 0.4 + drift * i / 6, y + 0.008 + i * 0.022, z + Math.cos(i * 0.9) * 0.004 * i * 0.4]);
          const wisp = s.tube(pts, 0.0022, smokeMat);
          wisp.castShadow = false;
        }
        return;
      }
      const group = new THREE.Group();
      group.position.set(x, y + 0.004, z);
      const outer = new THREE.Mesh(flameGeo, flameMat); outer.scale.setScalar(size);
      const inner = new THREE.Mesh(flameGeo, coreMat); inner.scale.setScalar(size * 0.5); inner.position.y = size * 0.12;
      const halo = new THREE.Mesh(new THREE.SphereGeometry(size * 3.2, 12, 8), haloMat); halo.position.y = size * 0.7;
      group.add(outer, inner, halo);
      group.rotation.z = -lean * mix(0.7, 1.2, random());
      group.scale.y = mix(1, 0.75, a.draught);
      s.root.add(group);
      flames.push({ group, phase: random() * 10, size: group.scale.y });
    };
    const pool = (x: number, y: number, z: number, r: number, mat: THREE.Material) => {
      const blobs = 2 + Math.floor(random() * 3);
      for (let i = 0; i < blobs; i++) {
        const ang = random() * 6.28, d = r * mix(0.5, 1.2, random());
        const px=x+Math.cos(ang)*d,pz=z+Math.sin(ang)*d; s.ball([r * mix(0.5, 1, random()), 0.003, r * mix(0.5, 1, random())], [px,lift(px,pz)+.003,pz], mat, 12).castShadow = false;
      }
    };

    // Tall glass prayer candles.
    const rimMat = s.material({clear:'#e9eef0',brass:'#c3a053',silver:'#bdc7d0',black:'#353238'}[a.rimFinish], { roughness: 0.15, metalness: a.rimFinish==='clear'?.1:.7 });
    const waxDetail=(x:number,y:number,z:number,r:number,colour:string)=>{
      const mat=s.material(new THREE.Color(colour).multiplyScalar(.76),{roughness:.6});
      if(a.waxSurface==='rippled')for(let i=1;i<=4;i++)s.ring(r*i/5,.00045,[x,y+.0018,z],mat).rotation.x=Math.PI/2;
      if(a.waxSurface==='cracked')for(let i=0;i<5;i++){const t=i*Math.PI*2/5;s.tube([[x+Math.cos(t)*r*.25,y+.0018,z+Math.sin(t)*r*.25],[x+Math.cos(t+.2)*r*.65,y+.0018,z+Math.sin(t+.2)*r*.65],[x+Math.cos(t)*r*.91,y+.0018,z+Math.sin(t)*r*.91]],.00035,mat);}
      if(a.waxSurface==='flecked')for(let i=0;i<15;i++){const t=random()*Math.PI*2,d=Math.sqrt(random())*r*.9;s.ball([.0009,.00025,.0006],[x+Math.cos(t)*d,y+.0016,z+Math.sin(t)*d],mat,5);}
    };
    const tallSpots: { x: number; z: number; y: number }[] = [];
    for (let i = 0; i < n[0]; i++) {
      const { x, z } = place(0.033, 1);
      const y0 = lift(x,z,.033), h = mix(0.19, 0.22, random()), r = 0.03;
      const lit = isLit();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      let glass: string;
      if (a.imagery === 'plain') { glass = JEWELS[(i + Math.floor(random() * 2)) % JEWELS.length]; g.fillStyle = glass; g.fillRect(0, 0, 256, 256); }
      else {
        g.fillStyle = '#f4ecda'; g.fillRect(0, 0, 256, 256);
        const tint = paint[a.imagery](g);
        g.globalCompositeOperation = 'destination-over'; g.fillStyle = tint; g.fillRect(0, 0, 256, 256); g.globalCompositeOperation = 'source-over';
        glass = tint;
        g.fillStyle = a.imagery === 'muerte' ? '#d9a521' : '#a81a22'; g.fillRect(0, 0, 256, 10); g.fillRect(0, 244, 256, 12);
      }
      g.strokeStyle=a.labelBorder==='vines'?'#477c4b':'#d4b45b';g.lineWidth=3;
      if(a.labelBorder==='rays')for(let j=0;j<20;j++){const t=j/20*Math.PI*2;g.beginPath();g.moveTo(128+Math.cos(t)*101,128+Math.sin(t)*103);g.lineTo(128+Math.cos(t)*118,128+Math.sin(t)*119);g.stroke();}
      if(a.labelBorder==='vines')for(const x of [16,240]){g.beginPath();g.moveTo(x,20);g.lineTo(x,235);g.stroke();for(let y=30;y<230;y+=20){g.beginPath();g.ellipse(x+(y%40?4:-4),y,7,3,y*.1,0,Math.PI*2);g.stroke();}}
      if(a.labelBorder==='lace')for(let y=14;y<244;y+=13)for(const x of [12,244]){g.beginPath();g.arc(x,y,6,0,Math.PI*2);g.stroke();}
      // Soot and wax level darken the glass above the wax line.
      const level = mix(0.9, 0.12, Math.min(1, burn * mix(0.75, 1.2, random())));
      g.fillStyle = `rgba(30,22,16,${0.1 + burn * 0.22})`; g.fillRect(0, 0, 256, 256 * (1 - level));
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const bottomR=a.vessel==='tapered'?r*.76:r*.97,segments=a.vessel==='faceted'?8:64;
      const wall=new THREE.CylinderGeometry(r,bottomR,h,segments,1,true);
      if(a.vessel==='fluted'){const p=wall.getAttribute('position');for(let k=0;k<p.count;k++){const theta=Math.atan2(p.getZ(k),p.getX(k)),f=1+.04*Math.cos(theta*16);p.setXYZ(k,p.getX(k)*f,p.getY(k),p.getZ(k)*f);}wall.computeVertexNormals();}
      const body = s.mesh(wall, new THREE.MeshStandardMaterial({ map, roughness: 0.22, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: lit ? 0.5 * brightness : 0.04 }), [x, y0 + h / 2, z]);
      const vesselTurn=Math.PI+(random()-.5)*.9;body.rotation.y=vesselTurn;
      s.cylinder(bottomR,bottomR,0.004,[x,y0+.002,z],rimMat,segments).rotation.y=vesselTurn;
      if(a.vessel==='faceted'){const points:V3[]=[];for(let j=0;j<=8;j++){const t=j*Math.PI/4+vesselTurn;points.push([x+Math.sin(t)*r,y0+h,z+Math.cos(t)*r]);}s.tube(points,.0012,rimMat);}else s.ring(r,0.0022,[x,y0+h,z],rimMat).rotation.x=Math.PI/2;
      const waxY = y0 + h * level;
      const waxColour = a.imagery === 'plain' ? '#f3ead8' : waxes[Math.floor(random() * waxes.length)];
      const waxR=mix(bottomR,r,level)*.95;s.cylinder(waxR,waxR,.004,[x,waxY,z],s.material(waxColour,{roughness:.4,emissive:'#ffb347',emissiveIntensity:lit?.7:0}),segments).rotation.y=vesselTurn;waxDetail(x,waxY+.0003,z,waxR,waxColour);
      flame(x, waxY + 0.003, z, 0.0085, lit);
      tallSpots.push({ x, z, y: y0 });
      void glass;
    }

    // Bare pillar stubs with drips.
    for (let i = 0; i < n[2]; i++) {
      const { x, z } = place(0.026, 0.2);
      const y0 = lift(x,z,.026), r = mix(0.016, 0.023, random());
      const h = mix(0.15, 0.025, Math.min(1, burn * mix(0.7, 1.25, random())));
      const colour = waxes[Math.floor(random() * waxes.length)];
      const lit = isLit();
      const mat = s.material(colour, { roughness: 0.45, emissive: '#ff9a3a', emissiveIntensity: lit ? 0.22 * brightness : 0 });
      s.cylinder(r * 0.94, r, h, [x, y0 + h / 2, z], mat, a.pillarRelief==='faceted'?8:24);
      if(a.pillarRelief==='rings')for(let y=.006;y<h-.004;y+=.012)s.ring(mix(r,r*.94,y/h),.0016,[x,y0+y,z],mat).rotation.x=Math.PI/2;
      if(a.pillarRelief==='spiral'){const points:V3[]=[];for(let j=0;j<=80;j++){const u=j/80,t=u*Math.PI*10,rr=mix(r,r*.94,u);points.push([x+Math.cos(t)*rr,y0+.003+u*(h-.006),z+Math.sin(t)*rr]);}s.tube(points,.0015,mat);}
      waxDetail(x,y0+h-.0013,z,r*.92,colour);
      const drips = Math.round(mix(1, 7, burn));
      for (let d = 0; d < drips; d++) {
        const ang = random() * 6.28, len = Math.min(h * 0.9, mix(0.01, 0.06, random()));
        s.rod([x + Math.cos(ang) * r * 0.97, y0 + h - 0.002, z + Math.sin(ang) * r * 0.97], [x + Math.cos(ang) * r * 1.02, y0 + h - len, z + Math.sin(ang) * r * 1.02], 0.0028, mat, 0.004);
      }
      if (burn > 0.3) pool(x, y0, z, r * mix(1, 2.2, burn), mat);
      flame(x, y0 + h, z, 0.008, lit);
    }

    // Tea lights.
    const tin = s.material('#cfd4d6', { metalness: 0.8, roughness: 0.3 });
    for (let i = 0; i < n[1]; i++) {
      const { x, z } = place(0.022, -0.9);
      const y0 = lift(x,z,.022), lit = isLit();
      const colour = waxes[Math.floor(random() * waxes.length)];
      s.lathe([[0,0],[.0185,0],[.0195,.016],[.0185,.016],[.0175,.0015],[0,.0015]],tin,[x,y0,z]);
      const level = mix(0.015, 0.006, burn);
      s.cylinder(0.018, 0.018, 0.003, [x, y0 + level, z], s.material(colour, { roughness: 0.3, emissive: '#ffb347', emissiveIntensity: lit ? 0.6 : 0 }), 20);
      waxDetail(x,y0+level,z,.0175,colour);
      if (burn > 0.75 && random() < 0.5) pool(x, y0, z, 0.02, s.material(colour, { roughness: 0.4 }));
      flame(x, y0 + level + 0.002, z, 0.0065, lit);
    }

    // Left behind.
    const front = spread * 1.5 + 0.09;
    if (a.left === 'matches') {
      const box = s.box([0.052, 0.014, 0.036], [spread * 0.9,0.007,front], s.material('#c4262b'));
      box.rotation.y = 0.5;
      s.box([0.046, 0.0145, 0.03], [spread * 0.9,0.00725,front], s.material('#f2d24a')).rotation.y = 0.5;
      for (let i = 0; i < 5 + Math.floor(random() * 5); i++) {
        const x = (random() - 0.5) * spread * 2, z = front+random()*.04, ang = random() * 6.28;
        s.rod([x,.002,z],[x+Math.cos(ang)*.04,.0011,z+Math.sin(ang)*.04],.0011,s.material('#d8c49a'));
        s.ball([0.002,0.002,0.002],[x,.002,z],wickMat,6);
      }
    } else if (a.left === 'coins') {
      const brass = s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 }), silver = s.material('#c4c8ca', { metalness: 0.8, roughness: 0.3 });
      const coins:{x:number;z:number;top:number}[]=[];
      for(let i=0;i<5+Math.floor(random()*6);i++){const x=(random()-.5)*spread*2,z=front+random()*.04;let y=0;for(const p of coins)if(Math.hypot(p.x-x,p.z-z)<.022)y=Math.max(y,p.top);s.cylinder(.011,.011,.002,[x,y+.001,z],random()<.5?brass:silver,14);coins.push({x,z,top:y+.002});}
      const note = s.box([0.06, 0.004, 0.04], [-spread*.8,.002,front+.08], s.material('#f1ead2'));
      note.rotation.y = -0.4;
    } else if (a.left === 'flowers') {
      const petal = s.material('#ee7a0c', { flatShading: true, emissive: '#b84a00', emissiveIntensity: 0.15 });
      for (let i = 0; i < 6 + Math.floor(random() * 6); i++) {
        const { x, z } = place(0.027,random()*2-1.2,false);
        const bloom = s.mesh(new THREE.IcosahedronGeometry(mix(0.018, 0.025, random()), 1), petal, [x,0,z]);
        bloom.scale.y = 0.7; bloom.rotation.set(random(), random() * 6, random());
        bloom.updateMatrixWorld(true);bloom.position.y+=lift(x,z,.027)-new THREE.Box3().setFromObject(bloom,true).min.y;
      }
    } else if (a.left === 'card' && tallSpots.length) {
      const t = tallSpots[0];
      const card = s.label('ORA POR', 0.06, 0.085, [t.x + 0.012, t.y + 0.04, t.z + 0.05], '#7a1a22', '#f3e7c4');
      card.rotation.x = -0.32; card.rotation.y = 0.15;
    }

    const speed = mix(4, 16, mood.energy), amp = mix(0.04, 0.4, a.draught) * mix(0.6, 1.4, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const f of flames) {
          const w = Math.sin(time * speed + f.phase) * 0.6 + Math.sin(time * speed * 2.7 + f.phase * 1.7) * 0.4;
          f.group.scale.y = f.size * (1 + w * amp);
          f.group.rotation.x = w * amp * 0.4;
        }
      },
    });
  },
});

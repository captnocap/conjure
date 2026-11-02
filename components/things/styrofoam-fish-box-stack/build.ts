import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score, visibleBounds } from '@conjure/kit';

export default defineThing({
  questions: {
    height: score('How tall is the stack?', ['Two boxes', 'Waist high', 'Shoulder high', 'Over head height', 'A teetering tower nine boxes tall']),
    order: choice('How is it stacked?', {
      tidy: 'Squared up carefully, edges flush, someone takes pride.',
      leaning: 'Drifting off plumb, every box a little further over than the last.',
      twin: 'Two columns side by side, uneven heights, a wall of boxes.',
      toppled: 'It has gone over: the top boxes lie on the floor, one split, ice spilled.',
    }),
    binding: choice('What holds the lids on?', {
      brown: 'Bands of brown parcel tape.',
      blue: 'Blue and white printed packing tape.',
      string: 'Pink raffia string tied in a cross.',
      rubber: 'Black strips cut from inner tubes, stretched tight.',
      none: 'Nothing: the lids just sit there.',
    }),
    labels: choice('What is written on the sides?', {
      marker: 'Numbers and weights in fat black marker: a stall number, kilos.',
      red: 'Big red brush characters, a destination or a family name.',
      printed: 'Pre-printed blue fish logos and a KEEP COLD band.',
      mixed: 'Everything at once: reused boxes with old labels crossed out.',
      blank: 'Nothing. Anonymous white.',
    }),
    open: choice('Is one box open, and what shows?', {
      claw: 'Yes: crushed ice and a crab claw reaching over the rim.',
      fish: 'Yes: ice with fish tails sticking out.',
      empty: 'Yes: an empty with a finger of meltwater in the bottom, lid leaning against it.',
      closed: 'No: all sealed.',
    }),
    base: choice('What does the stack stand on?', {
      trolley: 'A steel sack trolley, tipped back on its wheels.',
      pallet: 'A wooden pallet dark with water.',
      crate: 'An upturned red plastic crate.',
      floor: 'Straight on the wet floor.',
    }),
    format: choice('What proportions are the foam boxes?', { standard: 'Standard rectangular fish boxes.', long: 'Long shallow boxes.', deep: 'Deep compact boxes.', square: 'Nearly square wide boxes.' }),
    corners: choice('How are their corners protected?', { bare: 'Plain foam corners.', tape: 'Short red tape corner patches.', cardboard: 'Brown cardboard corner guards.', clips: 'Grey metal corner clips.' }),
    handholds: choice('How are the boxes lifted?', { recess: 'Plain recessed handholds.', rope: 'Short rope handles.', tabs: 'Moulded projecting foam grips.', slots: 'Long dark horizontal hand slots.' }),
    drainPlug: choice('What is fitted to the meltwater outlet?', { none: 'No visible plug.', red: 'A small red stopper.', blue: 'A blue capped outlet.', hose: 'A short curved rubber drain spout.' }),
    seal: choice('What inspection seal is on each box?', { none: 'No inspection seal.', round: 'A round red paper seal.', strip: 'A blue paper strip across the lid seam.', tag: 'A tied card under the corner tape.' }),
    deliveryKit: choice('What came with the delivery?', { none: 'No delivery kit.', clipboard: 'A clipboard leaning on a small crate.', straps: 'Two coiled webbing straps.', scales: 'A small floor scale waiting for the next box.' }),
    wrappingKit: choice('What packaging supplies lie beside the stack?', { none: 'No loose supplies.', tape: 'Two rolls of packing tape.', twine: 'A spool of red tying twine.', cutter: 'A tape dispenser beside a folded carton.' }),
    iceTools: choice('What ice handling tool is nearby?', { none: 'No tool.', scoop: 'A broad steel ice scoop.', shovel: 'A short shovel leaning against a bucket.', pail: 'A blue pail with an ice pick across its rim.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const [BW,BH,BD]=a.format==='long'?[.78,.22,.4]:a.format==='deep'?[.53,.35,.4]:a.format==='square'?[.62,.25,.58]:[.6,.27,.4];
    const foam = s.material('#f4f4ef', { roughness: 0.95 });
    const foamShade = s.material('#e4e5df', { roughness: 0.95 });
    const steel = s.material('#aeb4b6', { metalness: 0.6, roughness: 0.45 });
    const wet = new THREE.MeshStandardMaterial({ color: '#7d959c', roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.42, depthWrite: false });
    const iceMaterial = s.material('#eaf4f7', { roughness: 0.3 });
    const tape = { brown: s.material('#b98a4e', { roughness: 0.4 }), blue: s.material('#2e6fc2', { roughness: 0.4 }), string: s.material('#ef6f9a', { roughness: 0.6 }), rubber: s.material('#26282a', { roughness: 0.7 }), none: foam }[a.binding];

    const decal = (style: 'marker' | 'red' | 'printed') => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 112;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f4f4ef'; ctx.fillRect(0, 0, 256, 112);
      ctx.lineCap = 'round'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      const scrawl = (x: number, y: number, size: number, strokes: number) => {
        for (let k = 0; k < strokes; k++) { ctx.beginPath(); ctx.moveTo(x + random() * size, y + random() * size); ctx.quadraticCurveTo(x + random() * size, y + random() * size, x + random() * size, y + random() * size); ctx.stroke(); }
      };
      if (style === 'marker') {
        ctx.fillStyle = ctx.strokeStyle = '#17191c'; ctx.lineWidth = 5;
        ctx.save(); ctx.translate(90, 56); ctx.rotate((random() - 0.5) * 0.2);
        ctx.font = '900 58px sans-serif'; ctx.fillText(pick(['A-12', '38', 'No.7', '15kg', 'B6', '204', '8.5K']), 0, 0, 150);
        ctx.restore();
        ctx.font = '900 30px sans-serif'; ctx.fillText(pick(['x2', '20K', 'OK', '#3', '']), 205, 34 + random() * 40);
        if (random() < 0.5) { ctx.beginPath(); ctx.ellipse(205, 60, 40, 30, 0, 0, 7); ctx.stroke(); }
      } else if (style === 'red') {
        ctx.strokeStyle = '#c81f24'; ctx.lineWidth = 9;
        for (let g = 0; g < 3; g++) scrawl(30 + g * 70, 22, 58, 5);
      } else {
        ctx.fillStyle = '#2a63b8'; ctx.fillRect(0, 84, 256, 18);
        ctx.fillStyle = '#f4f4ef'; ctx.font = '900 14px sans-serif'; ctx.fillText('KEEP COLD   SEAFOOD   KEEP COLD', 128, 94, 250);
        ctx.fillStyle = '#2a63b8';
        ctx.beginPath(); ctx.ellipse(110, 44, 46, 20, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(150, 44); ctx.lineTo(182, 22); ctx.lineTo(182, 66); ctx.fill();
        ctx.fillStyle = '#f4f4ef'; ctx.beginPath(); ctx.arc(84, 40, 5, 0, 7); ctx.fill();
        ctx.fillStyle = '#2a63b8'; ctx.font = '900 20px sans-serif'; ctx.fillText(pick(['FRESH', 'HK', '10KG']), 222, 46);
      }
      if (a.labels === 'mixed') { ctx.strokeStyle = '#17191c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(20, 20 + random() * 60); ctx.lineTo(236, 30 + random() * 60); ctx.stroke(); }
      // Grime and old tape ghosts.
      for (let i = 0; i < mood.wear * 50; i++) { ctx.fillStyle = `rgba(90,80,60,${random() * 0.12})`; ctx.fillRect(random() * 256, random() * 112, 4 + random() * 30, 2 + random() * 8); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 });
    };
    const styles: ('marker' | 'red' | 'printed')[] = a.labels === 'mixed' ? ['marker', 'red', 'printed', 'marker'] : a.labels === 'blank' ? [] : [a.labels, a.labels, a.labels];
    const decals = styles.map(decal);

    const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number]) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(...at); m.castShadow = m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const part = (parent: THREE.Object3D, size: [number, number, number], at: [number, number, number], material: THREE.Material) => {
      const m = mesh(parent, unit, material, at);
      m.scale.set(...size);
      return m;
    };

    /** One box sitting on y = 0 of its own group. */
    const box = (lid: 'on' | 'ajar' | 'off') => {
      const g = new THREE.Group();
      const lidH = 0.05;
      if (lid === 'on') part(g, [BW - 0.03, BH - lidH, BD - 0.03], [0, (BH - lidH) / 2, 0], foam);
      else {
        // Hollow: a floor and four walls.
        part(g, [BW - 0.03, 0.03, BD - 0.03], [0, 0.015, 0], foam);
        for (const z of [-1, 1]) part(g, [BW - 0.03, BH - lidH, 0.035], [0, (BH - lidH) / 2, z * (BD / 2 - 0.032)], foam);
        for (const x of [-1, 1]) part(g, [0.035, BH - lidH, BD - 0.03], [x * (BW / 2 - 0.032), (BH - lidH) / 2, 0], foam);
      }
      part(g, [BW - 0.01, 0.02, BD - 0.01], [0, BH - lidH - 0.03, 0], foamShade);
      if (lid === 'on') {
        part(g, [BW, lidH, BD], [0, BH - lidH / 2, 0], foam);
        if (a.binding === 'string') {
          part(g, [0.012, BH + 0.008, BD + 0.008], [(random() - 0.5) * 0.1, BH / 2, 0], tape);
          part(g, [BW + 0.008, BH + 0.008, 0.012], [0, BH / 2, (random() - 0.5) * 0.08], tape);
        } else if (a.binding !== 'none') {
          const width = a.binding === 'rubber' ? 0.03 : 0.055;
          for (const side of random() < 0.5 ? [-1, 1] : [0]) part(g, [width, BH + 0.006, BD + 0.006], [side * BW * 0.28 + (random() - 0.5) * 0.04, BH / 2, 0], tape);
          if (a.binding !== 'rubber' && random() < 0.6) part(g, [BW + 0.006, 0.05, BD + 0.006], [0, BH - lidH - 0.005, 0], tape);
        }
      }
      if (decals.length) {
        const front = mesh(g, new THREE.PlaneGeometry(BW * 0.82, (BH - lidH) * 0.82), pick(decals), [0, (BH - lidH) / 2, BD / 2 - 0.014]);
        front.castShadow = false;
        const side = mesh(g, new THREE.PlaneGeometry(BD * 0.8, (BH - lidH) * 0.8), pick(decals), [BW / 2 - 0.014, (BH - lidH) / 2, 0]);
        side.rotation.y = Math.PI / 2; side.castShadow = false;
      }
      const trim=s.material(a.corners==='tape'?'#b84635':a.corners==='cardboard'?'#ae8a57':'#939c9d');
      if(a.corners!=='bare')for(const x of[-1,1])for(const z of[-1,1]){part(g,[.055,.08,.008],[x*(BW/2-.03),.06,z*(BD/2-.01)],trim);part(g,[.008,.08,.055],[x*(BW/2-.01),.06,z*(BD/2-.03)],trim);}
      for(const side of[-1,1]) {
        const x=side*(BW/2-.012),y=BH*.48;
        if(a.handholds==='rope'){const handle=mesh(g,new THREE.TorusGeometry(.045,.005,6,16,Math.PI),s.material('#b29a68'),[x,y,0]);handle.rotation.set(0,Math.PI/2,Math.PI);}
        else if(a.handholds==='tabs')part(g,[.045,.025,.14],[x,y,0],foam);
        else part(g,[.006,a.handholds==='slots'?.025:.035,a.handholds==='slots'?.2:.12],[x,y,0],foamShade);
      }
      if(a.drainPlug!=='none') {
        const z=BD/2-.006,x=BW*.32;
        if(a.drainPlug==='hose'){const spout=mesh(g,new THREE.TorusGeometry(.035,.009,6,12,Math.PI/2),s.material('#455153'),[x,.045,z+.025]);spout.rotation.y=Math.PI/2;}
        else {const plug=mesh(g,new THREE.CylinderGeometry(a.drainPlug==='red'?.018:.024,a.drainPlug==='red'?.018:.024,.02,12),s.material(a.drainPlug==='red'?'#b83c34':'#538cbd'),[x,.04,z]);plug.rotation.x=Math.PI/2;}
      }
      if(a.seal==='round'){const seal=mesh(g,new THREE.CircleGeometry(.033,16),s.material('#ba4338'),[-BW*.28,BH-.06,BD/2+.004]);seal.castShadow=false;}
      else if(a.seal==='strip')part(g,[.035,.09,.008],[-BW*.28,BH-.055,BD/2+.003],s.material('#527d9f'));
      else if(a.seal==='tag'){part(g,[.065,.08,.008],[-BW*.28,BH-.08,BD/2+.012],s.material('#e1cda3'));part(g,[.004,.055,.008],[-BW*.28,BH-.02,BD/2+.012],s.material('#785d40'));}
      // Meltwater streaks from the bottom corners.
      if (random() < 0.3 + mood.wear * 0.5) part(g, [0.03 + random() * 0.05, 0.12 + random() * 0.1, 0.004], [(random() - 0.5) * BW * 0.8, -0.04, BD / 2 - 0.012], wet).castShadow = false;
      return g;
    };

    const claws: THREE.Object3D[] = [];
    const fill = (g: THREE.Group, what: 'claw' | 'fish' | 'empty') => {
      if (what === 'empty') { part(g, [BW - 0.1, 0.01, BD - 0.1], [0, 0.036, 0], wet).castShadow = false; return; }
      part(g, [BW - 0.1, BH - 0.12, BD - 0.1], [0, (BH - 0.12) / 2 + 0.03, 0], iceMaterial);
      const chunks = Array.from({ length: 70 }, () => ({ at: [(random() - 0.5) * (BW - 0.12), BH - 0.09 + random() * 0.03, (random() - 0.5) * (BD - 0.12)] as [number, number, number], size: 0.014 + random() * 0.018 }));
      const ice = s.scatter(new THREE.IcosahedronGeometry(1, 0), iceMaterial, chunks);
      g.add(ice);
      if (what === 'claw') {
        const shell = s.material(pick(['#c9482a', '#3d6f8a', '#8a5a2e']), { roughness: 0.35 });
        const tip = s.material('#2a1c18', { roughness: 0.4 });
        for (let i = 0; i < 1 + Math.floor(random() * 2); i++) {
          const arm = new THREE.Group();
          arm.position.set(mix(-0.12, 0.16, random()), BH - 0.08, BD / 2 - 0.09 - i * 0.12);
          const upper = mesh(arm, new THREE.CapsuleGeometry(0.018, 0.08, 3, 8), shell, [0, 0.05, 0.02]); upper.rotation.x = 0.5;
          const palm = mesh(arm, new THREE.SphereGeometry(1, 10, 8), shell, [0, 0.11, 0.07]); palm.scale.set(0.035, 0.045, 0.03); palm.rotation.x = 1.0;
          const finger = mesh(arm, new THREE.ConeGeometry(0.014, 0.07, 6), tip, [0, 0.135, 0.125]); finger.rotation.x = 1.3;
          const thumb = mesh(arm, new THREE.ConeGeometry(0.011, 0.06, 6), tip, [0, 0.1, 0.125]); thumb.rotation.x = 1.75;
          arm.rotation.y = (random() - 0.5) * 0.9;
          g.add(arm); claws.push(arm);
        }
        mesh(g, new THREE.SphereGeometry(1, 12, 8), shell, [0.02, BH - 0.07, -0.02]).scale.set(0.09, 0.03, 0.07);
      } else {
        const skin = s.material(pick(['#b9c3ca', '#d8452c', '#e0b63a']), { roughness: 0.3, metalness: 0.3, side: THREE.DoubleSide });
        for (let i = 0; i < 4; i++) {
          const tail = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-0.06, 0.13), new THREE.Vector2(0, 0.09), new THREE.Vector2(0.06, 0.13)]);
          const fin = mesh(g, new THREE.ShapeGeometry(tail), skin, [mix(-0.2, 0.2, i / 3), BH - 0.07, (random() - 0.5) * 0.2]);
          fin.rotation.set((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.6);
          mesh(g, new THREE.CapsuleGeometry(0.025, 0.05, 3, 8), skin, [fin.position.x, BH - 0.09, fin.position.z]);
        }
      }
    };

    // Base.
    let baseY = 0;
    if (a.base === 'pallet') {
      const timber = s.material('#8a6a48', { roughness: 0.9 });
      for (const z of [-0.34, 0, 0.34]) s.box([1.0, 0.09, 0.09], [0, 0.045, z], timber);
      for (let i = 0; i < 6; i++) s.box([0.14, 0.022, 0.8], [-0.43 + i * 0.172, 0.101, 0], timber).rotation.y = (random() - 0.5) * 0.03;
      baseY = 0.112;
    } else if (a.base === 'crate') {
      const red = s.material(pick(['#c9372c', '#2f6fb3', '#e0a52a']), { roughness: 0.6 });
      s.box([0.62, 0.28, 0.44], [0, 0.14, 0], red);
      const dark = s.material('#3a2020');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) s.box([0.09, 0.07, 0.445], [-0.21 + i * 0.14, 0.08 + j * 0.12, 0], dark);
      baseY = 0.28;
    } else if (a.base === 'trolley') {
      s.box([0.5, 0.012, 0.3], [0, 0.03, 0.04], steel);
      for (const x of [-1, 1]) {
        s.rod([x * 0.22, 0.03, -0.2], [x * 0.22, 1.25, -0.28], 0.014, steel);
        s.cylinder(0.11, 0.11, 0.05, [x * 0.3, 0.11, -0.26], s.material('#26282a'), 16).rotation.z = Math.PI / 2;
      }
      s.rod([-0.3, 0.11, -0.26], [0.3, 0.11, -0.26], 0.012, steel);
      for (const y of [0.45, 0.85, 1.25]) s.rod([-0.22, y, -0.2 - (y / 1.25) * 0.08], [0.22, y, -0.2 - (y / 1.25) * 0.08], 0.012, steel);
      s.tube([[-0.22, 1.25, -0.28], [-0.2, 1.36, -0.34], [0.2, 1.36, -0.34], [0.22, 1.25, -0.28]], 0.016, s.material('#26282a'));
      baseY = 0.038;
    }

    const total = Math.round(mix(2, 9, a.height) + (random() - 0.5) * 0.8);
    const fallen = a.order === 'toppled' ? Math.max(1, Math.round(total * 0.4)) : 0;
    const columns = a.order === 'twin' ? [Math.ceil(total * 0.6), Math.max(1, Math.floor(total * 0.5))] : [total - fallen];
    const openWhat = a.open === 'closed' ? null : a.open;
    let openDone = false;
    columns.forEach((count, column) => {
      let parent: THREE.Object3D = s.root;
      const lean = a.order === 'leaning' ? 1 : a.order === 'toppled' ? 0.6 : a.order === 'tidy' ? 0.08 : 0.3;
      const dir = random() < 0.5 ? -1 : 1;
      for (let i = 0; i < count; i++) {
        const top = i === count - 1;
        const opened = top && openWhat && !openDone && a.order !== 'toppled' && column === columns.length - 1;
        const g = box(opened ? 'off' : 'on');
        if (i === 0) g.position.set(columns.length > 1 ? (column - 0.5) * (BW + 0.04) : 0, baseY, 0);
        else {
          g.position.set(dir * lean * mix(0.02, 0.06, random()) + (random() - 0.5) * 0.02 * (1 + lean * 2), BH + 0.002, (random() - 0.5) * 0.03 * (1 + lean * 2));
          g.rotation.set((random() - 0.5) * 0.01 * lean, (random() - 0.5) * 0.12 * (0.3 + lean), -dir * lean * mix(0.008, 0.022, random()));
        }
        const supportY=i===0?baseY:BH;g.updateMatrixWorld(true);g.position.y+=supportY-visibleBounds(g).min.y;
        parent.add(g);
        parent = g;
        if (opened) {
          openDone = true;
          fill(g, openWhat);
          // Lid slid back and propped.
          const lid = part(g, [BW, 0.05, BD], [0.06, BH + 0.06, -BD / 2 - 0.02], foam);
          lid.rotation.set(-1.0, 0.1, 0);
        }
      }
    });

    // Fallen boxes on the floor to one side.
    for (let i = 0; i < fallen; i++) {
      const first = i === 0;
      const g = box(first ? 'off' : 'on');
      const x = (BW * 0.9 + 0.25 + i * 0.3) * (i % 2 ? -1 : 1), z = 0.25 + random() * 0.35;
      if (first) {
        // Landed on its side, mouth toward the viewer, ice fanned out.
        g.rotation.set(Math.PI / 2, 0, (random() - 0.5) * 0.5);
        g.position.set(x, BD / 2 - 0.2, z - 0.1);
        g.rotation.order = 'YXZ'; g.rotation.y = (random() - 0.5) * 0.6;
        const spill = Array.from({ length: 90 }, () => { const r = Math.sqrt(random()) * 0.5, t = random() * Math.PI - Math.PI / 2; return { at: [x + Math.sin(t) * r, 0.012 + random() * 0.02 * (1 - r), z + 0.15 + Math.cos(t) * r * 0.8] as [number, number, number], size: 0.014 + random() * 0.02 }; });
        s.scatter(new THREE.IcosahedronGeometry(1, 0), iceMaterial, spill);
        const lid = part(s.root, [BW, 0.05, BD], [x + 0.3, 0.03, z + 0.5], foam);
        lid.rotation.y = random() * 3;
        if (openWhat && openWhat !== 'empty') {
          const loose = new THREE.Group();
          loose.position.set(x - 0.05, -BH + 0.09, z + 0.4);
          fill(loose, openWhat);
          loose.children.slice(0, 2).forEach((child) => { child.visible = false; });
          s.root.add(loose);
        }
      } else {
        g.position.set(x, 0, z + 0.2);
        g.rotation.set(0, random() * 3, 0);
        if (random() < 0.5) { g.rotation.z = Math.PI / 2; g.position.y = BW / 2; g.position.x += BH / 2; }
      }
      g.updateMatrixWorld(true);g.position.y-=visibleBounds(g).min.y;
      s.root.add(g);
    }

    // Puddle under it all.
    const puddle = s.cylinder(1, 1, 0.005, [0.1, 0.003, 0.12], wet, 28);
    puddle.scale.set(mix(0.5, 0.95, mood.wear) + fallen * 0.15, 1, mix(0.35, 0.6, mood.wear));
    puddle.castShadow = false;

    const iron=s.material('#374145'),wood=s.material('#987957'),red=s.material('#b84b40');
    if(a.deliveryKit==='clipboard'){s.box([.3,.18,.24],[-.83,.09,-.08],wood);const board=s.box([.23,.3,.02],[-.83,.29,-.1],wood);board.rotation.x=-.25;s.box([.07,.018,.03],[-.83,.43,-.063],steel);}
    else if(a.deliveryKit==='straps')for(const z of[-.06,.13]){s.cylinder(.065,.065,.045,[-.8,.0225,z],red,20);s.box([.045,.006,.18],[-.8,.003,z+.1],red);}
    else if(a.deliveryKit==='scales'){s.box([.46,.07,.42],[-.83,.035,0],steel);s.box([.4,.025,.36],[-.83,.0825,0],iron);s.rod([-.83,.07,-.2],[-.83,.5,-.2],.012,steel);s.box([.18,.1,.04],[-.83,.53,-.2],iron);s.box([.14,.05,.006],[-.83,.54,-.176],s.material('#a9c6a5'));}
    const kx=.75,kz=-.4;
    if(a.wrappingKit==='tape')for(const dx of[-.06,.06]){const ring=s.ring(.045,.012,[kx+dx,.012,kz],s.material('#b98a4e'));ring.rotation.x=Math.PI/2;}
    else if(a.wrappingKit==='twine'){s.cylinder(.055,.055,.11,[kx,.055,kz],s.material('#c35b64'),20);for(const y of[.008,.102])s.cylinder(.065,.065,.016,[kx,y,kz],wood,16);}
    else if(a.wrappingKit==='cutter'){s.box([.28,.012,.25],[kx,.006,kz],wood);s.box([.15,.045,.055],[kx,.0345,kz],iron);s.cylinder(.035,.035,.045,[kx-.045,.067,kz],s.material('#b98a4e'),16).rotation.x=Math.PI/2;}
    if(a.iceTools!=='none') {
      const x=-.75,z=.48;
      if(a.iceTools==='scoop'){s.box([.14,.015,.22],[x,.0075,z],steel);for(const dx of[-.065,.065])s.box([.012,.05,.22],[x+dx,.03,z],steel);s.rod([x,.035,z-.1],[x,.035,z-.3],.014,wood);}
      else {s.lathe([[0,0],[.1,0],[.14,.25]],s.material('#548ca6'),[x,0,z]);if(a.iceTools==='pail'){s.rod([x-.22,.26,z],[x+.2,.26,z],.012,wood);s.rod([x-.15,.26,z-.06],[x-.15,.26,z+.06],.007,steel);}else{const shovel=new THREE.Group();s.root.add(shovel);shovel.add(s.box([.18,.22,.014],[0,.11,0],steel));shovel.add(s.rod([0,.18,0],[0,.65,0],.014,wood));shovel.rotation.x=-.32;shovel.position.set(x+.22,0,z);shovel.updateMatrixWorld(true);shovel.position.y-=new THREE.Box3().setFromObject(shovel,true).min.y;}}
    }

    const energy = mood.energy;
    return s.finish({
      footprint: columns.length > 1 ? 0.8 : 0.6 + fallen * 0.25,
      update(_dt, time) {
        claws.forEach((arm, index) => { arm.rotation.x = Math.sin(time * mix(0.4, 1.6, energy) + index * 2) * 0.25; });
      },
    });
  },
});
